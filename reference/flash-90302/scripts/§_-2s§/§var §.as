package §_-2s§
{
   import Playtomic.Log;
   import §_-0V§.§_-0S§;
   import §_-0V§.§_-18§;
   import §_-0V§.§_-2Q§;
   import §_-0V§.§_-2n§;
   import §_-0V§.§_-51§;
   import §_-0V§.§_-5G§;
   import §_-0V§.§_-5P§;
   import §_-0V§.override;
   import §_-0V§.§use §;
   import §_-2g§.§_-1d§;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.text.TextField;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol424")]
   public class §var § extends §_-07§
   {
      
      public var §_-1x§:SimpleButton;
      
      public var theSpotlight:MovieClip;
      
      public var §_-z§:SimpleButton;
      
      public var §_-05§:SimpleButton;
      
      public var §_-5K§:SimpleButton;
      
      public var §_-5N§:SimpleButton;
      
      public var §_-59§:TextField;
      
      public var §_-N§:SimpleButton;
      
      public var §_-4L§:SimpleButton;
      
      public var §_-1I§:SimpleButton;
      
      public var §in §:MovieClip;
      
      public var §_-17§:SimpleButton;
      
      public var §_-08§:MovieClip;
      
      private var §_-0O§:Array = [];
      
      private var §_-n§:Class;
      
      private var §_-0h§:Class;
      
      public function §var §()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         SimpleButton(this.§_-1I§).addEventListener(MouseEvent.MOUSE_UP,this.§_-4f§);
         SimpleButton(this.§_-5K§).addEventListener(MouseEvent.MOUSE_UP,this.§_-0H§);
         SimpleButton(this.§_-z§).addEventListener(MouseEvent.MOUSE_UP,this.§_-04§);
         SimpleButton(this.§_-5N§).addEventListener(MouseEvent.MOUSE_UP,this.§_-Z§);
         SimpleButton(this.§_-4L§).addEventListener(MouseEvent.MOUSE_UP,this.§_-4x§);
         SimpleButton(this.§_-1x§).addEventListener(MouseEvent.MOUSE_UP,this.§_-2V§);
         SimpleButton(this.§_-05§).addEventListener(MouseEvent.MOUSE_UP,this.§ each§);
         SimpleButton(this.§_-N§).addEventListener(MouseEvent.MOUSE_UP,this.§ in§);
         SimpleButton(this.§_-17§).addEventListener(MouseEvent.MOUSE_UP,this.§_-1V§);
      }
      
      private function §_-1V§(param1:MouseEvent) : void
      {
         var _loc2_:§_-1d§ = null;
         if(this.§_-0O§.length > 0)
         {
            _loc2_ = this.§_-0O§.pop();
            _loc2_.§ case§();
         }
      }
      
      private function § in§(param1:MouseEvent) : void
      {
         if(this.§_-n§ != null && this.§_-0h§ != null && this.§_-0O§.length == 2)
         {
            §_-u§.§_-1i§ = this.§_-n§;
            §_-u§.§_-1k§ = this.§_-0h§;
            §_-0v§.§_-5q§(new §_-R§("multiplayer"));
         }
         if(this.§_-n§ == §_-18§)
         {
            Log.CustomMetric("PlayedAsJoe","PlayersMulti",false);
         }
         else if(this.§_-n§ == §_-51§)
         {
            Log.CustomMetric("PlayedAsNadia","PlayersMulti",false);
         }
         else if(this.§_-n§ == §_-0S§)
         {
            Log.CustomMetric("PlayedAsHarry","PlayersMulti",false);
         }
         else if(this.§_-n§ == §_-5G§)
         {
            Log.CustomMetric("PlayedAsRobot","PlayersMulti",false);
         }
         else if(this.§_-n§ == override)
         {
            Log.CustomMetric("PlayedAsToaster","PlayersMulti",false);
         }
         else if(this.§_-n§ == §_-2n§)
         {
            Log.CustomMetric("PlayedAsPirate","PlayersMulti",false);
         }
         else if(this.§_-n§ == §use §)
         {
            Log.CustomMetric("PlayedAsTopHat","PlayersMulti",false);
         }
         else if(this.§_-n§ == §_-5P§)
         {
            Log.CustomMetric("PlayedAsDevil","PlayersMulti",false);
         }
         if(this.§_-0h§ == §_-18§)
         {
            Log.CustomMetric("PlayedAsJoe","PlayersMulti",false);
         }
         else if(this.§_-0h§ == §_-51§)
         {
            Log.CustomMetric("PlayedAsNadia","PlayersMulti",false);
         }
         else if(this.§_-0h§ == §_-0S§)
         {
            Log.CustomMetric("PlayedAsHarry","PlayersMulti",false);
         }
         else if(this.§_-0h§ == §_-5G§)
         {
            Log.CustomMetric("PlayedAsRobot","PlayersMulti",false);
         }
         else if(this.§_-0h§ == override)
         {
            Log.CustomMetric("PlayedAsToaster","PlayersMulti",false);
         }
         else if(this.§_-0h§ == §_-2n§)
         {
            Log.CustomMetric("PlayedAsPirate","PlayersMulti",false);
         }
         else if(this.§_-0h§ == §use §)
         {
            Log.CustomMetric("PlayedAsTopHat","PlayersMulti",false);
         }
         else if(this.§_-0h§ == §_-5P§)
         {
            Log.CustomMetric("PlayedAsDevil","PlayersMulti",false);
         }
      }
      
      private function §if§(param1:Class) : void
      {
         var _loc2_:§_-1d§ = null;
         if(this.§_-0O§.length < 2)
         {
            _loc2_ = new §_-1d§();
            _loc2_.speed = 800;
            addChild(_loc2_);
            if(param1 == §_-2Q§)
            {
               _loc2_.gotoAndStop(1);
            }
            else if(param1 == §_-18§)
            {
               _loc2_.gotoAndStop(2);
            }
            else if(param1 == §_-51§)
            {
               _loc2_.gotoAndStop(3);
            }
            else if(param1 == override)
            {
               _loc2_.gotoAndStop(4);
            }
            else if(param1 == §_-2n§)
            {
               _loc2_.gotoAndStop(5);
            }
            else if(param1 == §use §)
            {
               _loc2_.gotoAndStop(6);
            }
            else if(param1 == §_-5P§)
            {
               _loc2_.gotoAndStop(7);
            }
            else if(param1 == §_-5G§)
            {
               _loc2_.gotoAndStop(8);
            }
            else if(param1 == §_-0S§)
            {
               _loc2_.gotoAndStop(9);
            }
            if(this.§_-0O§.length == 0)
            {
               _loc2_.targetX = MovieClip(this.§_-08§).x;
               _loc2_.x = -50;
               _loc2_.y = MovieClip(this.§_-08§).y;
               this.§_-n§ = param1;
            }
            else if(this.§_-0O§.length == 1)
            {
               _loc2_.targetX = MovieClip(this.§in §).x;
               _loc2_.x = stage.stageWidth + 50;
               _loc2_.y = MovieClip(this.§in §).y;
               _loc2_.scaleX *= -1;
               this.§_-0h§ = param1;
            }
            this.§_-0O§.push(_loc2_);
         }
      }
      
      private function §_-4f§(param1:MouseEvent) : void
      {
         this.§if§(§_-0S§);
      }
      
      private function §_-0H§(param1:MouseEvent) : void
      {
         this.§if§(§_-18§);
      }
      
      private function §_-04§(param1:MouseEvent) : void
      {
         this.§if§(§_-51§);
      }
      
      private function §_-Z§(param1:MouseEvent) : void
      {
         this.§if§(override);
      }
      
      private function §_-4x§(param1:MouseEvent) : void
      {
         this.§if§(§_-2n§);
      }
      
      private function §_-2V§(param1:MouseEvent) : void
      {
         this.§if§(§use §);
      }
      
      private function § each§(param1:MouseEvent) : void
      {
         this.§if§(§_-5P§);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(this.§_-0O§.length == 0)
         {
            TextField(this.§_-59§).text = "-Selecting Player 1-";
         }
         else if(this.§_-0O§.length == 1)
         {
            TextField(this.§_-59§).text = "-Selecting Player 2-";
         }
         else if(this.§_-0O§.length == 2)
         {
            TextField(this.§_-59§).text = "Ready to play!";
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.§_-1I§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-4f§);
         SimpleButton(this.§_-5K§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-0H§);
         SimpleButton(this.§_-z§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-04§);
         SimpleButton(this.§_-5N§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-Z§);
         SimpleButton(this.§_-4L§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-4x§);
         SimpleButton(this.§_-1x§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-2V§);
         SimpleButton(this.§_-05§).removeEventListener(MouseEvent.MOUSE_UP,this.§ each§);
         SimpleButton(this.§_-N§).removeEventListener(MouseEvent.MOUSE_UP,this.§ in§);
         SimpleButton(this.§_-17§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-1V§);
      }
   }
}

