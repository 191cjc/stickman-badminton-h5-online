package §_-2s§
{
   import CPMStar.AdLoader;
   import Playtomic.Link;
   import Playtomic.Log;
   import bobby.§ null§;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import bobby.§_-3e§;
   import bobby.§_-4n§;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.utils.getTimer;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol37")]
   public class §_-53§ extends §_-07§
   {
      
      public var §case§:MovieClip;
      
      public var kongBtn:SimpleButton;
      
      public var theAdBorder:MovieClip;
      
      public var §_-I§:MovieClip;
      
      public var §_-3w§:SimpleButton;
      
      public var §_-2G§:Symbol1shgsadhggsadfgfdg;
      
      private var dead:Boolean = false;
      
      private var §_-1F§:Number;
      
      private var §_-56§:Number = 0;
      
      private var §_-1g§:Number = 0;
      
      private var §_-A§:Number = 0;
      
      public function §_-53§()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         var _loc2_:int = 0;
         var _loc3_:int = 0;
         var _loc4_:DisplayObject = null;
         super.handleStageAdd(param1);
         this.§_-1g§ = getTimer();
         if(§_-4n§.§_-5L§)
         {
            this.§_-56§ = 0;
         }
         else
         {
            this.§_-56§ = 8000;
            _loc2_ = 12941;
            _loc3_ = 7;
            _loc4_ = AdLoader.LoadAd(_loc2_,_loc3_);
            MovieClip(this.§_-I§).addChild(_loc4_);
         }
         trace(§_-4n§.§_-5L§);
         if(§_-4n§.§_-5L§)
         {
            this.theAdBorder.visible = false;
            this.§_-I§.visible = false;
            this.kongBtn.visible = false;
            this.§_-3w§.visible = true;
         }
         else
         {
            this.theAdBorder.visible = true;
            this.§_-I§.visible = true;
            this.kongBtn.visible = true;
            this.§_-3w§.visible = false;
         }
         this.§_-1g§ = getTimer();
         this.§_-A§ = getTimer();
         this.§_-1F§ = MovieClip(root).loaderInfo.bytesLoaded;
         SimpleButton(this.kongBtn).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         SimpleButton(this.§_-3w§).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
      }
      
      private function kongClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"PreloaderLogo","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         var _loc2_:Number = NaN;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         super.handleEnterFrame(param1);
         if(MovieClip(root).loaderInfo)
         {
            _loc2_ = (MovieClip(root).loaderInfo.bytesLoaded + 1 - this.§_-1F§) / (MovieClip(root).loaderInfo.bytesTotal + 1 - this.§_-1F§);
            if(§_-3e§.§_-3M§(50))
            {
               this.§_-A§ += param1 * 1000 * §_-3e§.§ else§(0,4);
            }
            _loc3_ = (this.§_-A§ - this.§_-1g§) / this.§_-56§;
            if(_loc2_ > _loc3_)
            {
               _loc4_ = _loc3_;
            }
            else
            {
               _loc4_ = _loc2_;
            }
            MovieClip(this.§case§).scaleX = _loc4_;
         }
         if(_loc4_ >= 1 && !this.dead)
         {
            this.dead = true;
            § null§(this.§_-2G§).play();
            § null§(this.§_-2G§).addEventListener(MouseEvent.MOUSE_UP,this.§_-4Z§);
         }
      }
      
      private function §_-4Z§(param1:MouseEvent) : void
      {
         Log.CustomMetric("SurvivedPreloader","Misc",true);
         MovieClip(root).gotoAndStop(2);
         §_-0v§.§_-5q§(new §_-1K§());
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         § null§(this.§_-2G§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-4Z§);
         SimpleButton(this.kongBtn).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         SimpleButton(this.§_-3w§).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
      }
   }
}

