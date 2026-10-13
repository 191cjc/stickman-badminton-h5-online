package ui
{
   import CPMStar.AdLoader;
   import Playtomic.Link;
   import Playtomic.Log;
   import §_-0V§.*;
   import §_-2s§.§_-4o§;
   import bobby.§_-0v§;
   import bobby.§_-4n§;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol309")]
   public class DeathScreen extends MovieClip
   {
      
      public var moreBtn:SimpleButton;
      
      public var theSpotlight:MovieClip;
      
      public var theAdBorder:MovieClip;
      
      public var kongBtn:SimpleButton;
      
      public var characterSet:MovieClip;
      
      public var §_-I§:MovieClip;
      
      public var backBtn:SimpleButton;
      
      public var retryBtn:SimpleButton;
      
      private var fadingIn:Boolean = true;
      
      private var fadingOut:Boolean = false;
      
      public function DeathScreen(param1:Class)
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.handleStageAdd);
         this.fadingIn = true;
         this.fadingOut = false;
         if(param1 == §_-2Q§)
         {
            MovieClip(this).characterSet.gotoAndStop(1);
         }
         else if(param1 == §_-18§)
         {
            MovieClip(this).characterSet.gotoAndStop(2);
         }
         else if(param1 == §_-51§)
         {
            MovieClip(this).characterSet.gotoAndStop(3);
         }
         else if(param1 == §_-0S§)
         {
            MovieClip(this).characterSet.gotoAndStop(4);
         }
         else if(param1 == §_-2n§)
         {
            MovieClip(this).characterSet.gotoAndStop(6);
         }
         else if(param1 == §use §)
         {
            MovieClip(this).characterSet.gotoAndStop(5);
         }
         else if(param1 == §_-5P§)
         {
            MovieClip(this).characterSet.gotoAndStop(7);
         }
         else if(param1 == §_-5G§)
         {
            MovieClip(this).characterSet.gotoAndStop(8);
         }
         else if(param1 == override)
         {
            MovieClip(this).characterSet.gotoAndStop(9);
         }
      }
      
      public function remove() : void
      {
         parent.removeChild(this);
      }
      
      private function handleStageAdd(param1:Event) : void
      {
         var _loc2_:int = 0;
         var _loc3_:int = 0;
         var _loc4_:DisplayObject = null;
         if(§_-4n§.§_-5L§)
         {
            gotoAndStop(1);
         }
         else
         {
            gotoAndStop(2);
            _loc2_ = 12941;
            _loc3_ = 8;
            _loc4_ = AdLoader.LoadAd(_loc2_,_loc3_);
            MovieClip(this.§_-I§).addChild(_loc4_);
         }
         removeEventListener(Event.ADDED_TO_STAGE,this.handleStageAdd);
         addEventListener(Event.REMOVED_FROM_STAGE,this.handleRemove);
         MovieClip(this).retryBtn.addEventListener(MouseEvent.MOUSE_UP,this.retryBtnRelease);
         MovieClip(this).backBtn.addEventListener(MouseEvent.MOUSE_UP,this.backBtnRelease);
         SimpleButton(this.kongBtn).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         SimpleButton(this.moreBtn).addEventListener(MouseEvent.MOUSE_UP,this.moreClick);
      }
      
      private function kongClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"DeathScreenLogo","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function moreClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"DeathScreenMoreGames","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function retryBtnRelease(param1:MouseEvent) : void
      {
         this.goToTitle();
      }
      
      private function backBtnRelease(param1:MouseEvent) : void
      {
         this.goToTitle();
      }
      
      public function goToTitle() : void
      {
         §_-0v§.§_-5q§(new §_-4o§());
      }
      
      private function handleRemove(param1:Event) : void
      {
         MovieClip(this).retryBtn.removeEventListener(MouseEvent.MOUSE_UP,this.retryBtnRelease);
         MovieClip(this).backBtn.removeEventListener(MouseEvent.MOUSE_UP,this.retryBtnRelease);
         removeEventListener(Event.REMOVED_FROM_STAGE,this.handleRemove);
         SimpleButton(this.kongBtn).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         SimpleButton(this.moreBtn).removeEventListener(MouseEvent.MOUSE_UP,this.moreClick);
      }
   }
}

